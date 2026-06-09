package com.jobtap.app.api

data class AnalyticsEventDto(
    val eventType: AnalyticsEventType,
    val deviceId: String,
    val countryCode: String,
    val jobId: String? = null,
    val platform: String = "android",
    val appVersion: String? = null,
    val locale: String? = null,
    val sourceScreen: String? = null,
    val eventSchemaVersion: Int = 1
)
