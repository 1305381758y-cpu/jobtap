package com.jobtap.app.data

import com.jobtap.app.api.MobileJobDto
import org.junit.Assert.assertEquals
import org.junit.Test

class JobMapperTest {

    @Test
    fun `map remote job labels remoteLabel as Remote`() {
        val dto = MobileJobDto(
            id = "1",
            title = "Engineer",
            employerName = "Acme",
            countryCode = "US",
            city = "San Francisco",
            isRemote = true,
            salaryText = "$100k",
            workTimeText = "Full-time",
            description = "Build stuff",
            contactUrl = "https://example.com",
            publishedAt = null,
            createdAt = null
        )
        val job = JobMapper.map(dto)
        assertEquals("Remote", job.remoteLabel)
    }

    @Test
    fun `map non-remote job labels remoteLabel as Local`() {
        val dto = MobileJobDto(
            id = "2",
            title = "Barista",
            employerName = "Blue Bottle",
            countryCode = "US",
            city = "San Francisco",
            isRemote = false,
            salaryText = "$18/hr",
            workTimeText = "Part-time",
            description = "Make coffee",
            contactUrl = "https://example.com",
            publishedAt = null,
            createdAt = null
        )
        val job = JobMapper.map(dto)
        assertEquals("Local", job.remoteLabel)
    }

    @Test
    fun `map job with city produces city comma countryCode location`() {
        val dto = MobileJobDto(
            id = "3",
            title = "Designer",
            employerName = "Design Co",
            countryCode = "US",
            city = "New York",
            isRemote = false,
            salaryText = "$80k",
            workTimeText = "Full-time",
            description = "Design things",
            contactUrl = "https://example.com",
            publishedAt = null,
            createdAt = null
        )
        val job = JobMapper.map(dto)
        assertEquals("New York, US", job.location)
    }

    @Test
    fun `map job without city uses countryCode as location`() {
        val dto = MobileJobDto(
            id = "4",
            title = "Remote Dev",
            employerName = "Remote Inc",
            countryCode = "CA",
            city = "",
            isRemote = true,
            salaryText = "$120k",
            workTimeText = "Full-time",
            description = "Code remotely",
            contactUrl = "https://example.com",
            publishedAt = null,
            createdAt = null
        )
        val job = JobMapper.map(dto)
        assertEquals("CA", job.location)
    }

    @Test
    fun `map job with blank city uses countryCode as location`() {
        val dto = MobileJobDto(
            id = "5",
            title = "Support Agent",
            employerName = "Support Co",
            countryCode = "PH",
            city = "  ",
            isRemote = true,
            salaryText = "$15/hr",
            workTimeText = "Flexible",
            description = "Help customers",
            contactUrl = "https://example.com",
            publishedAt = null,
            createdAt = null
        )
        val job = JobMapper.map(dto)
        assertEquals("PH", job.location)
    }

    @Test
    fun `map job with null city uses countryCode as location`() {
        val dto = MobileJobDto(
            id = "6",
            title = "Rust Engineer",
            employerName = "Systems Co",
            countryCode = "DE",
            city = null,
            isRemote = false,
            salaryText = "€90k",
            workTimeText = "Full-time",
            description = "Build systems",
            contactUrl = "https://example.com",
            publishedAt = null,
            createdAt = null
        )
        val job = JobMapper.map(dto)
        assertEquals("DE", job.location)
    }

    @Test
    fun `map job always returns Posted recently for postedDate`() {
        val dtoWithPublished = MobileJobDto(
            id = "6",
            title = "Writer",
            employerName = "Content Co",
            countryCode = "GB",
            city = "London",
            isRemote = false,
            salaryText = "£40k",
            workTimeText = "Part-time",
            description = "Write content",
            contactUrl = "https://example.com",
            publishedAt = "2026-05-01T10:00:00Z",
            createdAt = null
        )
        val dtoWithCreated = dtoWithPublished.copy(
            publishedAt = null,
            createdAt = "2026-04-28T08:00:00Z"
        )
        val dtoBoth = dtoWithPublished.copy(
            createdAt = "2026-04-28T08:00:00Z"
        )
        val dtoNull = dtoWithPublished.copy(
            publishedAt = null,
            createdAt = null
        )
        assertEquals("Posted recently", JobMapper.map(dtoWithPublished).postedDate)
        assertEquals("Posted recently", JobMapper.map(dtoWithCreated).postedDate)
        assertEquals("Posted recently", JobMapper.map(dtoBoth).postedDate)
        assertEquals("Posted recently", JobMapper.map(dtoNull).postedDate)
    }
}
