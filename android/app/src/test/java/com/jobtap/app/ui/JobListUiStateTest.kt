package com.jobtap.app.ui

import com.jobtap.app.model.Job
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class JobListUiStateTest {

    private val sampleJob = Job(
        id = "1",
        title = "Engineer",
        employer = "Acme",
        salary = "$100k",
        workTime = "Full-time",
        location = "US",
        remoteLabel = "Remote",
        postedDate = "Posted recently",
        description = "Build stuff",
        contactUrl = "https://example.com"
    )

    private val sampleJob2 = Job(
        id = "2",
        title = "Designer",
        employer = "DesignCo",
        salary = "$90k",
        workTime = "Full-time",
        location = "US",
        remoteLabel = "Remote",
        postedDate = "Posted recently",
        description = "Design stuff",
        contactUrl = "https://example.com"
    )

    private val sampleJob3 = Job(
        id = "3",
        title = "Manager",
        employer = "Corp",
        salary = "$120k",
        workTime = "Full-time",
        location = "US",
        remoteLabel = "On-site",
        postedDate = "Posted recently",
        description = "Manage stuff",
        contactUrl = "https://example.com"
    )

    @Test
    fun `Loading is the default state`() {
        val state: JobListUiState = JobListUiState.Loading
        assertTrue(state is JobListUiState.Loading)
        assertFalse(state.isEmpty)
    }

    @Test
    fun `Success with jobs is a loaded state and not empty`() {
        val state: JobListUiState = JobListUiState.Success(listOf(sampleJob))
        assertTrue(state is JobListUiState.Success)
        val success = state as JobListUiState.Success
        assertEquals(1, success.jobs.size)
        assertEquals("Engineer", success.jobs[0].title)
        assertFalse(success.isEmpty)
    }

    @Test
    fun `Success with empty list represents an empty state`() {
        val state: JobListUiState = JobListUiState.Success(emptyList())
        assertTrue(state is JobListUiState.Success)
        val success = state as JobListUiState.Success
        assertTrue(success.jobs.isEmpty())
        assertTrue(success.isEmpty)
    }

    @Test
    fun `Error state contains a failure message`() {
        val state: JobListUiState = JobListUiState.Error("Connection timeout")
        assertTrue(state is JobListUiState.Error)
        val error = state as JobListUiState.Error
        assertEquals("Connection timeout", error.message)
        assertFalse(state.isEmpty)
    }

    @Test
    fun `default Success fields have correct pagination defaults`() {
        val success = JobListUiState.Success(listOf(sampleJob))
        assertEquals(2, success.nextPage)
        assertTrue(success.canLoadMore)
        assertFalse(success.isLoadingMore)
        assertNull(success.loadMoreError)
    }

    @Test
    fun `startLoadingMore sets isLoadingMore and clears loadMoreError`() {
        val success = JobListUiState.Success(
            jobs = listOf(sampleJob),
            loadMoreError = "Previous error"
        )
        val loading = success.startLoadingMore()
        assertTrue(loading.isLoadingMore)
        assertNull(loading.loadMoreError)
        assertEquals(listOf(sampleJob), loading.jobs)
        assertEquals(2, loading.nextPage)
        assertTrue(loading.canLoadMore)
    }

    @Test
    fun `appendPage appends jobs and increments nextPage`() {
        val success = JobListUiState.Success(listOf(sampleJob))
        val appended = success.appendPage(listOf(sampleJob2), pageSize = 20)
        assertEquals(2, appended.jobs.size)
        assertEquals("Engineer", appended.jobs[0].title)
        assertEquals("Designer", appended.jobs[1].title)
        assertEquals(3, appended.nextPage)
        assertFalse(appended.isLoadingMore)
        assertNull(appended.loadMoreError)
    }

    @Test
    fun `appendPage sets canLoadMore true when newJobs size equals pageSize`() {
        val success = JobListUiState.Success(listOf(sampleJob))
        val appended = success.appendPage(listOf(sampleJob2), pageSize = 1)
        assertTrue(appended.canLoadMore)
    }

    @Test
    fun `appendPage sets canLoadMore true when newJobs size exceeds pageSize`() {
        val success = JobListUiState.Success(listOf(sampleJob))
        val appended = success.appendPage(listOf(sampleJob2, sampleJob3), pageSize = 2)
        assertTrue(appended.canLoadMore)
    }

    @Test
    fun `appendPage sets canLoadMore false when newJobs size is less than pageSize`() {
        val success = JobListUiState.Success(listOf(sampleJob))
        val appended = success.appendPage(listOf(sampleJob2), pageSize = 10)
        assertFalse(appended.canLoadMore)
    }

    @Test
    fun `failLoadingMore preserves jobs page and canLoadMore and sets error`() {
        val success = JobListUiState.Success(
            jobs = listOf(sampleJob, sampleJob2),
            isLoadingMore = true
        )
        val failed = success.failLoadingMore("Network error")
        assertFalse(failed.isLoadingMore)
        assertEquals("Network error", failed.loadMoreError)
        assertEquals(2, failed.jobs.size)
        assertEquals(2, failed.nextPage)
        assertTrue(failed.canLoadMore)
    }
}
