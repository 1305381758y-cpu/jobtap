package com.jobtap.app.ui

import com.jobtap.app.model.Job

sealed interface JobDetailUiState {
    data object Idle : JobDetailUiState
    data class Loading(val jobId: String) : JobDetailUiState
    data class Loaded(val job: Job) : JobDetailUiState
    data class Error(val jobId: String, val message: String) : JobDetailUiState

    val selectedJobId: String?
        get() = when (this) {
            is Idle -> null
            is Loading -> jobId
            is Loaded -> job.id
            is Error -> jobId
        }

    val canShowDetail: Boolean
        get() = this is Loaded
}
