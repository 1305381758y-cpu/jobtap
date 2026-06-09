package com.jobtap.app.ui

import com.jobtap.app.model.Job
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

class JobDetailUiStateTest {

    private val sampleJob = Job(
        id = "job_001",
        title = "Android Developer",
        employer = "TechCorp",
        salary = "$120k",
        workTime = "Full-time",
        location = "Remote",
        remoteLabel = "Remote",
        postedDate = "2025-05-12",
        description = "Build Android apps with Kotlin.",
        contactUrl = "https://example.com/apply"
    )

    // State creation

    @Test
    fun `Idle is the initial state`() {
        val state: JobDetailUiState = JobDetailUiState.Idle
        assertTrue(state is JobDetailUiState.Idle)
    }

    @Test
    fun `Loading holds a jobId`() {
        val state: JobDetailUiState = JobDetailUiState.Loading("abc123")
        assertTrue(state is JobDetailUiState.Loading)
        assertEquals("abc123", (state as JobDetailUiState.Loading).jobId)
    }

    @Test
    fun `Loaded holds a Job`() {
        val state: JobDetailUiState = JobDetailUiState.Loaded(sampleJob)
        assertTrue(state is JobDetailUiState.Loaded)
        val loaded = state as JobDetailUiState.Loaded
        assertEquals(sampleJob, loaded.job)
        assertEquals("Android Developer", loaded.job.title)
    }

    @Test
    fun `Error holds jobId and message`() {
        val state: JobDetailUiState = JobDetailUiState.Error("job_007", "Not found")
        assertTrue(state is JobDetailUiState.Error)
        val error = state as JobDetailUiState.Error
        assertEquals("job_007", error.jobId)
        assertEquals("Not found", error.message)
    }

    // selectedJobId

    @Test
    fun `selectedJobId returns null for Idle`() {
        val state: JobDetailUiState = JobDetailUiState.Idle
        assertNull(state.selectedJobId)
    }

    @Test
    fun `selectedJobId returns jobId for Loading`() {
        val state: JobDetailUiState = JobDetailUiState.Loading("abc123")
        assertEquals("abc123", state.selectedJobId)
    }

    @Test
    fun `selectedJobId returns job id for Loaded`() {
        val state: JobDetailUiState = JobDetailUiState.Loaded(sampleJob)
        assertEquals("job_001", state.selectedJobId)
    }

    @Test
    fun `selectedJobId returns jobId for Error`() {
        val state: JobDetailUiState = JobDetailUiState.Error("job_007", "Not found")
        assertEquals("job_007", state.selectedJobId)
    }

    // canShowDetail

    @Test
    fun `canShowDetail is false for Idle`() {
        assertFalse(JobDetailUiState.Idle.canShowDetail)
    }

    @Test
    fun `canShowDetail is false for Loading`() {
        assertFalse(JobDetailUiState.Loading("abc123").canShowDetail)
    }

    @Test
    fun `canShowDetail is true for Loaded`() {
        assertTrue(JobDetailUiState.Loaded(sampleJob).canShowDetail)
    }

    @Test
    fun `canShowDetail is false for Error`() {
        assertFalse(JobDetailUiState.Error("job_007", "Not found").canShowDetail)
    }

    // Error message retention

    @Test
    fun `Error retains the exact message provided`() {
        val state = JobDetailUiState.Error("job_007", "Server returned 500")
        assertEquals("Server returned 500", state.message)
    }

    @Test
    fun `Error retains an empty message`() {
        val state = JobDetailUiState.Error("job_007", "")
        assertEquals("", state.message)
    }

    @Test
    fun `Error retains a special character message`() {
        val state = JobDetailUiState.Error("job_007", "Error: job <not_found> & retry?")
        assertEquals("Error: job <not_found> & retry?", state.message)
    }

    @Test
    fun `two Error states with same fields are equal`() {
        val e1 = JobDetailUiState.Error("job_007", "Timeout")
        val e2 = JobDetailUiState.Error("job_007", "Timeout")
        assertEquals(e1, e2)
    }

    // Idle / Loading equality

    @Test
    fun `Idle is a singleton`() {
        val a = JobDetailUiState.Idle
        val b = JobDetailUiState.Idle
        assertSame(a, b)
    }

    @Test
    fun `Loading with same jobId are equal`() {
        assertEquals(
            JobDetailUiState.Loading("x"),
            JobDetailUiState.Loading("x")
        )
    }

    @Test
    fun `Loading with different jobId are not equal`() {
        assertNotEquals(
            JobDetailUiState.Loading("x"),
            JobDetailUiState.Loading("y")
        )
    }

    // Cross-state checks

    @Test
    fun `different state types are never equal`() {
        assertNotEquals(JobDetailUiState.Idle, JobDetailUiState.Loading("x"))
        assertNotEquals(JobDetailUiState.Idle, JobDetailUiState.Loaded(sampleJob))
        assertNotEquals(JobDetailUiState.Idle, JobDetailUiState.Error("x", "m"))
        assertNotEquals(
            JobDetailUiState.Loading("x"),
            JobDetailUiState.Loaded(sampleJob)
        )
        assertNotEquals(
            JobDetailUiState.Loaded(sampleJob),
            JobDetailUiState.Error("job_001", "m")
        )
    }
}
