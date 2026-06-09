package com.jobtap.app.data

import com.jobtap.app.api.MobileJobDto
import com.jobtap.app.model.Job

object JobMapper {

    fun map(dto: MobileJobDto): Job {
        return Job(
            id = dto.id,
            title = dto.title,
            employer = dto.employerName,
            salary = dto.salaryText,
            workTime = dto.workTimeText,
            location = buildLocation(dto),
            remoteLabel = if (dto.isRemote) "Remote" else "Local",
            postedDate = buildPostedDate(dto),
            description = dto.description,
            contactUrl = dto.contactUrl
        )
    }

    private fun buildLocation(dto: MobileJobDto): String {
        val city = dto.city
        return if (!city.isNullOrBlank()) {
            "$city, ${dto.countryCode}"
        } else {
            dto.countryCode
        }
    }

    @Suppress("UNUSED_PARAMETER")
    private fun buildPostedDate(dto: MobileJobDto): String {
        return "Posted recently"
    }
}
