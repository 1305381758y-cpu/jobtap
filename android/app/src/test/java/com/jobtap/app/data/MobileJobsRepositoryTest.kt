package com.jobtap.app.data

import com.jobtap.app.api.AnalyticsEventDto
import com.jobtap.app.api.AnalyticsEventType
import com.jobtap.app.api.BootstrapResponse
import com.jobtap.app.api.MobileBackendApi
import com.jobtap.app.api.MobileJobDto
import com.jobtap.app.api.MobileJobsResponse
import com.jobtap.app.model.Job
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MobileJobsRepositoryTest {

    /** Fake that records params and returns canned responses. */
    private class FakeMobileBackendApi : MobileBackendApi {
        var bootstrapCountryCode: String? = null
        var bootstrapResult: BootstrapResponse = BootstrapResponse(
            countryCode = "US",
            countrySource = "geolocation",
            supportedLocales = listOf("en-US"),
            appConfig = emptyMap()
        )

        var listJobsCountryCode: String? = null
        var listJobsPage: Int? = null
        var listJobsResult: MobileJobsResponse = MobileJobsResponse(emptyList(), 1)

        var getJobId: String? = null
        var getJobCountryCode: String? = null
        var getJobResult: MobileJobDto? = null
        var getJobException: Exception? = null

        var postAnalyticsEvent: AnalyticsEventDto? = null
        var postAnalyticsException: Exception? = null

        override fun bootstrap(countryCode: String?): BootstrapResponse {
            bootstrapCountryCode = countryCode
            return bootstrapResult
        }

        override fun listJobs(countryCode: String, page: Int): MobileJobsResponse {
            listJobsCountryCode = countryCode
            listJobsPage = page
            return listJobsResult
        }

        override fun getJob(id: String, countryCode: String): MobileJobDto {
            getJobId = id
            getJobCountryCode = countryCode
            if (getJobException != null) throw getJobException!!
            return getJobResult!!
        }

        override fun postAnalytics(event: AnalyticsEventDto) {
            postAnalyticsEvent = event
            if (postAnalyticsException != null) throw postAnalyticsException!!
        }
    }

    // ------------------------------------------------------------------ helpers
    private fun sampleDto(
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
    ) = MobileJobDto(
        id = id,
        title = title,
        employerName = employerName,
        countryCode = countryCode,
        city = city,
        isRemote = isRemote,
        salaryText = salaryText,
        workTimeText = workTimeText,
        description = description,
        contactUrl = contactUrl,
        publishedAt = publishedAt,
        createdAt = createdAt
    )

    private fun assertJobMatchesDto(job: Job, dto: MobileJobDto) {
        assertEquals(dto.id, job.id)
        assertEquals(dto.title, job.title)
        assertEquals(dto.employerName, job.employer)
        assertEquals(dto.salaryText, job.salary)
        assertEquals(dto.workTimeText, job.workTime)
        assertEquals(dto.description, job.description)
        assertEquals(dto.contactUrl, job.contactUrl)
    }

    // ------------------------------------------------------------------ tests

    @Test
    fun `listJobs delegates countryCode and page, maps multiple DTOs to domain Jobs`() {
        val fake = FakeMobileBackendApi()
        fake.listJobsResult = MobileJobsResponse(
            items = listOf(
                sampleDto(id = "a", title = "Engineer", city = "San Francisco"),
                sampleDto(id = "b", title = "Designer", city = null)
            ),
            page = 2
        )
        val repo = MobileJobsRepository(fake)

        val result = repo.listJobs("US", 2)

        assertTrue("Expected success", result.isSuccess)
        assertEquals("US", fake.listJobsCountryCode)
        assertEquals(2, fake.listJobsPage)

        val jobs = result.getOrThrow()
        assertEquals(2, jobs.size)
        assertJobMatchesDto(jobs[0], sampleDto(id = "a", title = "Engineer", city = "San Francisco"))
        assertEquals("San Francisco, US", jobs[0].location)

        assertJobMatchesDto(jobs[1], sampleDto(id = "b", title = "Designer", city = null))
        assertEquals("US", jobs[1].location)
    }

    @Test
    fun `listJobs returns success with empty list when API returns empty items`() {
        val fake = FakeMobileBackendApi()
        fake.listJobsResult = MobileJobsResponse(emptyList(), 1)
        val repo = MobileJobsRepository(fake)

        val result = repo.listJobs("US", 1)

        assertTrue("Expected success", result.isSuccess)
        assertEquals(0, result.getOrThrow().size)
    }

    @Test
    fun `getJob delegates id and countryCode, maps detail DTO`() {
        val fake = FakeMobileBackendApi()
        val dto = sampleDto(
            id = "job-42",
            title = "Senior Engineer",
            employerName = "BigCo",
            countryCode = "CA",
            city = "Toronto",
            salaryText = "$150k",
            workTimeText = "Full-time",
            description = "Lead projects",
            contactUrl = "https://bigco.example",
            isRemote = true
        )
        fake.getJobResult = dto
        val repo = MobileJobsRepository(fake)

        val result = repo.getJob("job-42", "CA")

        assertTrue("Expected success", result.isSuccess)
        assertEquals("job-42", fake.getJobId)
        assertEquals("CA", fake.getJobCountryCode)

        val job = result.getOrThrow()
        assertJobMatchesDto(job, dto)
        assertEquals("Toronto, CA", job.location)
        assertEquals("Remote", job.remoteLabel)
    }

    @Test
    fun `API exception becomes Result failure and preserves the exception`() {
        val fake = FakeMobileBackendApi()
        val expected = RuntimeException("Network error")
        fake.getJobException = expected
        val repo = MobileJobsRepository(fake)

        val result = repo.getJob("x", "US")

        assertTrue("Expected failure", result.isFailure)
        val error = result.exceptionOrNull()
        assertNotNull("Exception should not be null", error)
        assertEquals(expected, error)
    }

    @Test
    fun `bootstrap delegates countryCode, returns BootstrapResponse`() {
        val fake = FakeMobileBackendApi()
        val expected = BootstrapResponse(
            countryCode = "CA",
            countrySource = "header",
            supportedLocales = listOf("en-CA", "fr-CA"),
            appConfig = mapOf("minVersion" to "2.0")
        )
        fake.bootstrapResult = expected
        val repo = MobileJobsRepository(fake)

        val result = repo.bootstrap("CA")

        assertTrue("Expected success", result.isSuccess)
        assertEquals("CA", fake.bootstrapCountryCode)
        val response = result.getOrThrow()
        assertEquals(expected.countryCode, response.countryCode)
        assertEquals(expected.countrySource, response.countrySource)
        assertEquals(expected.supportedLocales, response.supportedLocales)
        assertEquals(expected.appConfig, response.appConfig)
    }

    @Test
    fun `bootstrap passes null countryCode when called with null`() {
        val fake = FakeMobileBackendApi()
        val repo = MobileJobsRepository(fake)

        val result = repo.bootstrap(null)

        assertTrue("Expected success", result.isSuccess)
        assertEquals(null, fake.bootstrapCountryCode)
    }

    @Test
    fun `trackAnalytics delegates the exact event object`() {
        val fake = FakeMobileBackendApi()
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
        val repo = MobileJobsRepository(fake)

        val result = repo.trackAnalytics(event)

        assertTrue("Expected success", result.isSuccess)
        assertEquals(event, fake.postAnalyticsEvent)
    }
}
