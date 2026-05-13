package com.jobtap.app.api

interface MobileBackendApi {
    fun bootstrap(countryCode: String?): BootstrapResponse
    fun listJobs(countryCode: String, page: Int): MobileJobsResponse
    fun getJob(id: String, countryCode: String): MobileJobDto
    fun postAnalytics(event: AnalyticsEventDto)
}
