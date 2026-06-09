package com.jobtap.app.analytics

import com.jobtap.app.api.AnalyticsEventDto
import com.jobtap.app.api.AnalyticsEventType

class AnalyticsEventFactory(
    private val deviceIdProvider: DeviceIdProvider,
    private val appVersion: String
) {
    fun appOpen(countryCode: String, locale: String): AnalyticsEventDto {
        return AnalyticsEventDto(
            eventType = AnalyticsEventType.APP_OPEN,
            deviceId = deviceIdProvider.getOrCreateDeviceId(),
            countryCode = countryCode,
            platform = "android",
            appVersion = appVersion,
            locale = locale,
            sourceScreen = "app"
        )
    }

    fun jobListView(countryCode: String, locale: String): AnalyticsEventDto {
        return AnalyticsEventDto(
            eventType = AnalyticsEventType.JOB_LIST_VIEW,
            deviceId = deviceIdProvider.getOrCreateDeviceId(),
            countryCode = countryCode,
            platform = "android",
            appVersion = appVersion,
            locale = locale,
            sourceScreen = "jobs"
        )
    }

    fun jobDetailView(countryCode: String, locale: String, jobId: String): AnalyticsEventDto {
        return AnalyticsEventDto(
            eventType = AnalyticsEventType.JOB_DETAIL_VIEW,
            deviceId = deviceIdProvider.getOrCreateDeviceId(),
            countryCode = countryCode,
            jobId = jobId,
            platform = "android",
            appVersion = appVersion,
            locale = locale,
            sourceScreen = "job_detail"
        )
    }

    fun contactClick(countryCode: String, locale: String, jobId: String): AnalyticsEventDto {
        return AnalyticsEventDto(
            eventType = AnalyticsEventType.CONTACT_CLICK,
            deviceId = deviceIdProvider.getOrCreateDeviceId(),
            countryCode = countryCode,
            jobId = jobId,
            platform = "android",
            appVersion = appVersion,
            locale = locale,
            sourceScreen = "job_detail"
        )
    }
}
