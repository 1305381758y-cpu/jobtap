package com.jobtap.app.data

import com.jobtap.app.api.AnalyticsEventDto
import com.jobtap.app.api.BootstrapResponse
import com.jobtap.app.api.MobileBackendApi
import com.jobtap.app.model.Job

class MobileJobsRepository(
    private val api: MobileBackendApi
) {
    fun bootstrap(countryCodeQuery: String?): Result<BootstrapResponse> = runCatching {
        api.bootstrap(countryCodeQuery)
    }

    fun listJobs(countryCode: String, page: Int): Result<List<Job>> = runCatching {
        val response = api.listJobs(countryCode, page)
        response.items.map { dto -> JobMapper.map(dto) }
    }

    fun getJob(id: String, countryCode: String): Result<Job> = runCatching {
        val dto = api.getJob(id, countryCode)
        JobMapper.map(dto)
    }

    fun trackAnalytics(event: AnalyticsEventDto): Result<Unit> = runCatching {
        api.postAnalytics(event)
    }
}
