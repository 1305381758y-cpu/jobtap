package com.jobtap.app.model

data class Job(
    val id: String,
    val title: String,
    val employer: String,
    val salary: String,
    val workTime: String,
    val location: String,
    val remoteLabel: String,
    val postedDate: String,
    val description: String,
    val contactUrl: String
)
