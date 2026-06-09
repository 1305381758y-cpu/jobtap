package com.jobtap.app.api

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.IOException
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread

class HttpUrlConnectionApiTransportTest {

    private var server: FakeHttpServer? = null
    private lateinit var transport: HttpUrlConnectionApiTransport
    private lateinit var baseUrl: String

    @Before
    fun setUp() {
        transport = HttpUrlConnectionApiTransport(connectTimeoutMs = 5000, readTimeoutMs = 5000)
    }

    @After
    fun tearDown() {
        server?.stop()
    }

    @Test
    fun `GET returns body and server sees GET method`() {
        val fakeServer = FakeHttpServer { request ->
            assertEquals("GET", request.method)
            "hello from server"
        }
        server = fakeServer
        baseUrl = "http://localhost:${fakeServer.port}"
        val response = transport.get("$baseUrl/test-get")
        fakeServer.check()
        assertEquals("hello from server", response)
    }

    @Test
    fun `POST sends JSON body and content type starts with application slash json`() {
        val fakeServer = FakeHttpServer { request ->
            assertEquals("POST", request.method)
            val contentType = request.headers["Content-Type"]
            assertNotNull(contentType)
            assertTrue(contentType!!.startsWith("application/json"))
            assertEquals("""{"key":"value"}""", request.body)
            ""
        }
        server = fakeServer
        baseUrl = "http://localhost:${fakeServer.port}"
        transport.postJson("$baseUrl/test-post", """{"key":"value"}""")
        fakeServer.check()
    }

    @Test
    fun `non-2xx GET throws IOException with status code`() {
        val fakeServer = FakeHttpServer(statusCode = 404) {
            "Not Found"
        }
        server = fakeServer
        baseUrl = "http://localhost:${fakeServer.port}"
        val exception = assertThrows(IOException::class.java) {
            transport.get("$baseUrl/not-found")
        }
        fakeServer.check()
        assertTrue(exception.message!!.contains("404"))
    }

    data class HttpRequest(
        val method: String,
        val path: String,
        val headers: Map<String, String>,
        val body: String
    )

    private class FakeHttpServer(
        private val statusCode: Int = 200,
        private val handler: (HttpRequest) -> String
    ) {
        private val serverSocket = ServerSocket(0)
        val port: Int get() = serverSocket.localPort
        private val handlerError = AtomicReference<Throwable?>(null)

        init {
            thread(name = "fake-http-server", isDaemon = true) {
                try {
                    val socket = serverSocket.accept()
                    handleConnection(socket)
                } catch (e: Exception) {
                    handlerError.compareAndSet(null, e)
                }
            }
        }

        fun stop() {
            try {
                serverSocket.close()
            } catch (_: Exception) {
            }
        }

        fun check() {
            val error = handlerError.get()
            if (error != null) {
                throw AssertionError("Server handler assertion failed", error)
            }
        }

        private fun handleConnection(socket: Socket) {
            socket.use { s ->
                val reader = s.getInputStream().bufferedReader(Charsets.UTF_8)
                val writer = s.getOutputStream().bufferedWriter(Charsets.UTF_8)

                val requestLine = reader.readLine() ?: return
                val parts = requestLine.split(" ", limit = 3)
                if (parts.size < 2) return
                val method = parts[0]
                val path = parts[1]

                val headers = mutableMapOf<String, String>()
                while (true) {
                    val line = reader.readLine() ?: break
                    if (line.isEmpty()) break
                    val colonIdx = line.indexOf(':')
                    if (colonIdx > 0) {
                        val name = line.substring(0, colonIdx).trim()
                        val value = line.substring(colonIdx + 1).trim()
                        headers[name] = value
                    }
                }

                var body = ""
                val contentLength = headers["Content-Length"]?.toIntOrNull() ?: 0
                if (contentLength > 0) {
                    val buf = CharArray(contentLength)
                    reader.read(buf, 0, contentLength)
                    body = String(buf)
                }

                try {
                    val request = HttpRequest(method, path, headers, body)
                    val responseBody = handler(request)
                    val responseBytes = responseBody.toByteArray(Charsets.UTF_8)

                    writer.write("HTTP/1.1 $statusCode ${reasonPhrase(statusCode)}\r\n")
                    writer.write("Content-Length: ${responseBytes.size}\r\n")
                    writer.write("Connection: close\r\n")
                    writer.write("\r\n")
                    writer.write(responseBody)
                    writer.flush()
                } catch (e: Throwable) {
                    handlerError.compareAndSet(null, e)
                    writer.write("HTTP/1.1 500 Internal Server Error\r\n")
                    writer.write("Content-Length: 0\r\n")
                    writer.write("Connection: close\r\n")
                    writer.write("\r\n")
                    writer.flush()
                }
            }
        }

        private fun reasonPhrase(code: Int): String = when (code) {
            200 -> "OK"
            201 -> "Created"
            204 -> "No Content"
            400 -> "Bad Request"
            404 -> "Not Found"
            500 -> "Internal Server Error"
            else -> "Unknown"
        }
    }
}
