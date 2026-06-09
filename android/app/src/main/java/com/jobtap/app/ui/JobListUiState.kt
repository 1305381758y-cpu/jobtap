package com.jobtap.app.ui

import com.jobtap.app.model.Job

sealed interface JobListUiState {
    data object Loading : JobListUiState
    data class Success(
        val jobs: List<Job>,
        val nextPage: Int = 2,
        val canLoadMore: Boolean = true,
        val isLoadingMore: Boolean = false,
        val loadMoreError: String? = null
    ) : JobListUiState {
        fun startLoadingMore(): Success = copy(
            isLoadingMore = true,
            loadMoreError = null
        )

        fun appendPage(newJobs: List<Job>, pageSize: Int): Success = copy(
            jobs = jobs + newJobs,
            nextPage = nextPage + 1,
            isLoadingMore = false,
            loadMoreError = null,
            canLoadMore = newJobs.size >= pageSize
        )

        fun failLoadingMore(message: String): Success = copy(
            isLoadingMore = false,
            loadMoreError = message
        )
    }
    data class Error(val message: String) : JobListUiState

    val isEmpty: Boolean
        get() = this is Success && jobs.isEmpty()
}
