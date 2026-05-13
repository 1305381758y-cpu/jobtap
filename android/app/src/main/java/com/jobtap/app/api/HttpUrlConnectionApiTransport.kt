package com.jobtap.app.api

import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class HttpUrlConnectionApiTransport(
    private val connectTimeoutMs: Int = 10000,
    private val readTimeoutMs: Int = 10000
) : ApiTransport {

    override fun get(url: String): String {
        var connection: HttpURLConnection? = null
        return try {
            connection = URL(url).openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = connectTimeoutMs
            connection.readTimeout = readTimeoutMs

            val responseCode = connection.responseCode

            if (responseCode !in 200..299) {
                throw IOException("HTTP $responseCode for GET $url")
            }

            readBody(connection)
        } finally {
            connection?.disconnect()
        }
    }

    override fun postJson(url: String, jsonBody: String) {
        var connection: HttpURLConnection? = null
        try {
            connection = URL(url).openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.connectTimeout = connectTimeoutMs
            connection.readTimeout = readTimeoutMs
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")

            OutputStreamWriter(connection.outputStream, "UTF-8").use { writer ->
                writer.write(jsonBody)
            }

            val responseCode = connection.responseCode

            if (responseCode !in 200..299) {
                throw IOException("HTTP $responseCode for POST $url")
            }
        } finally {
            connection?.disconnect()
        }
    }

    private fun readBody(connection: HttpURLConnection): String {
        val reader = BufferedReader(InputStreamReader(connection.inputStream, "UTF-8"))
        val response = StringBuilder()
        var line: String?
        while (reader.readLine().also { line = it } != null) {
            response.append(line)
        }
        reader.close()
        return response.toString()
    }
}
