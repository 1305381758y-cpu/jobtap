package com.jobtap.app.api

data class MobileJobDto(
    val id: String,
    val title: String,
    val employerName: String,
    val countryCode: String,
    val city: String?,
    val isRemote: Boolean,
    val salaryText: String,
    val workTimeText: String,
    val description: String,
    val contactUrl: String,
    val publishedAt: String?,
    val createdAt: String?
)
