package com.jobtap.app.api

import org.json.JSONArray
import org.json.JSONObject

class MobileApiClient(
    private val baseUrl: String,
    private val transport: ApiTransport
) : MobileBackendApi {
    private val normalizedBaseUrl: String = baseUrl.trimEnd('/')

    override fun bootstrap(countryCode: String?): BootstrapResponse {
        val url = buildString {
            append("$normalizedBaseUrl/api/mobile/bootstrap")
            if (countryCode != null) {
                append("?countryCode=")
                append(java.net.URLEncoder.encode(countryCode, "UTF-8"))
            }
        }
        val responseBody = transport.get(url)
        val json = JSONObject(responseBody)
        return BootstrapResponse(
            countryCode = nullableString(json, "countryCode"),
            countrySource = nullableString(json, "countrySource"),
            supportedLocales = jsonArrayToList(json.optJSONArray("supportedLocales")),
            appConfig = parseAppConfig(json.optJSONObject("appConfig"))
        )
    }

    override fun listJobs(countryCode: String, page: Int): MobileJobsResponse {
        val url = "$normalizedBaseUrl/api/mobile/jobs?countryCode=$countryCode&page=$page"
        val responseBody = transport.get(url)
        val json = JSONObject(responseBody)
        val itemsArray = json.getJSONArray("items")
        val items = mutableListOf<MobileJobDto>()
        for (i in 0 until itemsArray.length()) {
            items.add(parseJobDto(itemsArray.getJSONObject(i)))
        }
        return MobileJobsResponse(
            items = items,
            page = json.getInt("page")
        )
    }

    override fun getJob(id: String, countryCode: String): MobileJobDto {
        val encodedId = encodePathSegment(id)
        val url = "$normalizedBaseUrl/api/mobile/jobs/$encodedId?countryCode=$countryCode"
        val responseBody = transport.get(url)
        val json = JSONObject(responseBody)
        return parseJobDto(json)
    }

    override fun postAnalytics(event: AnalyticsEventDto) {
        val json = event.toJson()
        transport.postJson("$normalizedBaseUrl/api/mobile/analytics/events", json)
    }

    private fun encodePathSegment(segment: String): String {
        return java.net.URLEncoder.encode(segment, "UTF-8").replace("+", "%20")
    }

    private fun parseJobDto(json: JSONObject): MobileJobDto {
        return MobileJobDto(
            id = json.getString("id"),
            title = json.getString("title"),
            employerName = json.getString("employerName"),
            countryCode = json.getString("countryCode"),
            city = nullableString(json, "city"),
            isRemote = json.getBoolean("isRemote"),
            salaryText = json.getString("salaryText"),
            workTimeText = json.getString("workTimeText"),
            description = json.getString("description"),
            contactUrl = json.getString("contactUrl"),
            publishedAt = nullableString(json, "publishedAt"),
            createdAt = nullableString(json, "createdAt")
        )
    }

    private fun AnalyticsEventDto.toJson(): String {
        val json = JSONObject()
        json.put("eventType", eventType.serverValue)
        json.put("deviceId", deviceId)
        json.put("countryCode", countryCode)
        jobId?.let { json.put("jobId", it) }
        json.put("platform", platform)
        appVersion?.let { json.put("appVersion", it) }
        locale?.let { json.put("locale", it) }
        sourceScreen?.let { json.put("sourceScreen", it) }
        return json.toString()
    }

    private fun nullableString(json: JSONObject, key: String): String? {
        return if (json.has(key) && !json.isNull(key)) json.getString(key) else null
    }

    private fun jsonArrayToList(array: JSONArray?): List<String> {
        if (array == null) return emptyList()
        val result = mutableListOf<String>()
        for (i in 0 until array.length()) {
            result.add(array.getString(i))
        }
        return result
    }

    private fun parseAppConfig(json: JSONObject?): Map<String, Any> {
        if (json == null) return emptyMap()
        val result = mutableMapOf<String, Any>()
        for (key in json.keys()) {
            val value = json.get(key)
            result[key] = value
        }
        return result
    }
}
