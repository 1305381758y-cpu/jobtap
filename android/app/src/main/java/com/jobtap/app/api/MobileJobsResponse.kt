package com.jobtap.app.api

data class MobileJobsResponse(
    val items: List<MobileJobDto>,
    val page: Int
)
