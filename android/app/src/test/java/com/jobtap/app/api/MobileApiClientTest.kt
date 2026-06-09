package com.jobtap.app.api

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MobileApiClientTest {

    /** A fake transport that captures the last request and returns canned response. */
    private class FakeTransport : ApiTransport {
        var lastUrl: String? = null
        var lastJsonBody: String? = null
        var responseBody: String = "{}"

        override fun get(url: String): String {
            lastUrl = url
            return responseBody
        }

        override fun postJson(url: String, jsonBody: String) {
            lastUrl = url
            lastJsonBody = jsonBody
        }
    }

    /** Build a JSON object that matches the MobileJobDto schema. */
    private fun jobJson(
        id: String = "1",
        title: String = "Engineer",
        employerName: String = "Acme",
        countryCode: String = "US",
        city: String? = "New York",
        isRemote: Boolean = false,
        salaryText: String = "$100k",
        workTimeText: String = "Full-time",
        description: String = "Build stuff",
        contactUrl: String = "https://example.com",
        publishedAt: String? = null,
        createdAt: String? = null
    ): JSONObject {
        val json = JSONObject()
        json.put("id", id)
        json.put("title", title)
        json.put("employerName", employerName)
        json.put("countryCode", countryCode)
        json.put("city", if (city != null) city else JSONObject.NULL)
        json.put("isRemote", isRemote)
        json.put("salaryText", salaryText)
        json.put("workTimeText", workTimeText)
        json.put("description", description)
        json.put("contactUrl", contactUrl)
        json.put("publishedAt", if (publishedAt != null) publishedAt else JSONObject.NULL)
        json.put("createdAt", if (createdAt != null) createdAt else JSONObject.NULL)
        return json
    }

    @Test
    fun `listJobs builds the correct URL and trims trailing slash from baseUrl`() {
        val transport = FakeTransport()
        transport.responseBody = """{"items":[],"page":1}"""
        val client = MobileApiClient("https://example.com/", transport)

        client.listJobs("US", 2)

        assertEquals(
            "Trailing slash should be trimmed",
            "https://example.com/api/mobile/jobs?countryCode=US&page=2",
            transport.lastUrl
        )
    }

    @Test
    fun `listJobs parses page and items including nullable city`() {
        val transport = FakeTransport()
        val jobWithCity = jobJson(id = "a", city = "San Francisco")
        val jobWithoutCity = jobJson(id = "b", city = null)
        val response = JSONObject().apply {
            put("items", JSONArray(listOf(jobWithCity, jobWithoutCity)))
            put("page", 3)
        }
        transport.responseBody = response.toString()
        val client = MobileApiClient("https://example.com", transport)

        val result = client.listJobs("US", 1)

        assertEquals(3, result.page)
        assertEquals(2, result.items.size)

        // job a: has a city
        assertEquals("a", result.items[0].id)
        assertEquals("San Francisco", result.items[0].city)

        // job b: city is null
        assertEquals("b", result.items[1].id)
        assertEquals(null, result.items[1].city)
    }

    @Test
    fun `getJob URL-encodes job id path segment`() {
        val transport = FakeTransport()
        transport.responseBody = jobJson(id = "complex id / with?chars").toString()
        val client = MobileApiClient("https://example.com", transport)

        val result = client.getJob("complex id / with?chars", "US")

        assertTrue(
            "Job id should be URL-encoded in the path",
            transport.lastUrl!!.contains("complex%20id%20%2F%20with%3Fchars")
        )
        assertEquals("complex id / with?chars", result.id)
    }

    @Test
    fun `getJob parses remote and local fields correctly`() {
        val transport = FakeTransport()
        transport.responseBody = jobJson(
            countryCode = "CA",
            id = "xyz",
            title = "Remote Dev",
            isRemote = true,
            publishedAt = "2026-05-01T10:00:00Z",
            createdAt = "2026-04-28T08:00:00Z"
        ).toString()
        val client = MobileApiClient("https://example.com", transport)

        val result = client.getJob("xyz", "CA")

        assertEquals("xyz", result.id)
        assertEquals("Remote Dev", result.title)
        assertEquals(true, result.isRemote)
        assertEquals("2026-05-01T10:00:00Z", result.publishedAt)
        assertEquals("2026-04-28T08:00:00Z", result.createdAt)
        assertEquals("CA", result.countryCode)
    }

    @Test
    fun `postAnalytics sends exact JSON keys and exact eventType string`() {
        val transport = FakeTransport()
        val client = MobileApiClient("https://example.com", transport)

        val event = AnalyticsEventDto(
            eventType = AnalyticsEventType.CONTACT_CLICK,
            deviceId = "device-123",
            countryCode = "US",
            jobId = "job-42",
            platform = "android",
            appVersion = "1.0.0",
            locale = "en-US",
            sourceScreen = "job_detail"
        )

        client.postAnalytics(event)

        assertEquals(
            "https://example.com/api/mobile/analytics/events",
            transport.lastUrl
        )

        val json = JSONObject(transport.lastJsonBody!!)
        assertEquals("contact_click", json.getString("eventType"))
        assertEquals("device-123", json.getString("deviceId"))
        assertEquals("US", json.getString("countryCode"))
        assertEquals("job-42", json.getString("jobId"))
        assertEquals("android", json.getString("platform"))
        assertEquals(1, json.getInt("eventSchemaVersion"))
        assertEquals("1.0.0", json.getString("appVersion"))
        assertEquals("en-US", json.getString("locale"))
        assertEquals("job_detail", json.getString("sourceScreen"))
        assertEquals("Should have exactly 9 keys", 9, json.length())
    }

    @Test
    fun `postAnalytics omits optional null fields from JSON`() {
        val transport = FakeTransport()
        val client = MobileApiClient("https://example.com", transport)

        val event = AnalyticsEventDto(
            eventType = AnalyticsEventType.APP_OPEN,
            deviceId = "device-456",
            countryCode = "GB"
        )

        client.postAnalytics(event)

        val json = JSONObject(transport.lastJsonBody!!)
        assertEquals("app_open", json.getString("eventType"))
        assertEquals("device-456", json.getString("deviceId"))
        assertEquals("GB", json.getString("countryCode"))
        assertEquals("android", json.getString("platform"))

        assertEquals(false, json.has("jobId"))
        assertEquals(false, json.has("appVersion"))
        assertEquals(false, json.has("locale"))
        assertEquals(false, json.has("sourceScreen"))
        assertEquals(1, json.getInt("eventSchemaVersion"))
        assertEquals("Should have exactly 5 keys", 5, json.length())
    }

    @Test
    fun `bootstrap calls correct URL with countryCode query param`() {
        val transport = FakeTransport()
        transport.responseBody = """{"countryCode":"US","countrySource":"device","supportedLocales":["en"],"appConfig":{"contactLinkMode":"external"}}"""
        val client = MobileApiClient("https://example.com/", transport)

        client.bootstrap("US")

        assertEquals(
            "https://example.com/api/mobile/bootstrap?countryCode=US",
            transport.lastUrl
        )
    }

    @Test
    fun `bootstrap without countryCode omits query param`() {
        val transport = FakeTransport()
        transport.responseBody = """{"countryCode":null,"countrySource":null,"supportedLocales":["en"],"appConfig":{"contactLinkMode":"external"}}"""
        val client = MobileApiClient("https://example.com/", transport)

        client.bootstrap(null)

        assertEquals(
            "https://example.com/api/mobile/bootstrap",
            transport.lastUrl
        )
    }

    @Test
    fun `bootstrap parses response with country code and source`() {
        val transport = FakeTransport()
        transport.responseBody = """{"countryCode":"DE","countrySource":"device","supportedLocales":["en","de"],"appConfig":{"contactLinkMode":"external"}}"""
        val client = MobileApiClient("https://example.com", transport)

        val result = client.bootstrap("DE")

        assertEquals("DE", result.countryCode)
        assertEquals("device", result.countrySource)
        assertEquals(listOf("en", "de"), result.supportedLocales)
        assertEquals("external", result.appConfig["contactLinkMode"])
    }

    @Test
    fun `bootstrap parses null country code response`() {
        val transport = FakeTransport()
        transport.responseBody = """{"countryCode":null,"countrySource":null,"supportedLocales":["en"],"appConfig":{"contactLinkMode":"external"}}"""
        val client = MobileApiClient("https://example.com", transport)

        val result = client.bootstrap(null)

        assertEquals(null, result.countryCode)
        assertEquals(null, result.countrySource)
    }
}
