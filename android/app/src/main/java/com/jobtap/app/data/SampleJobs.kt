package com.jobtap.app.data

import com.jobtap.app.model.Job

object SampleJobs {
    val jobs = listOf(
        Job(
            id = "job-1",
            title = "Barista",
            employer = "Blue Bottle Coffee",
            salary = "$18-22/hr + tips",
            workTime = "Part-time · 20-30 hrs/wk",
            location = "San Francisco, US",
            remoteLabel = "Local",
            postedDate = "Posted 1 day ago",
            description = "Prepare espresso drinks, keep the counter organized, and help customers through busy morning and weekend shifts.\n\nRequirements:\n1+ year barista experience, weekend availability, and strong customer service.",
            contactUrl = "https://example.com/jobs/barista"
        ),
        Job(
            id = "job-2",
            title = "Customer Support Agent",
            employer = "Northstar Services",
            salary = "$22-28/hr",
            workTime = "Flexible · Remote",
            location = "United States",
            remoteLabel = "Remote",
            postedDate = "Posted 2 days ago",
            description = "Answer customer questions by email, document recurring issues, and coordinate with operations when a request needs escalation.",
            contactUrl = "mailto:hiring@example.com"
        ),
        Job(
            id = "job-3",
            title = "Event Staff",
            employer = "Cityline Events",
            salary = "$20/hr",
            workTime = "Weekend shifts",
            location = "Chicago, US",
            remoteLabel = "Local",
            postedDate = "Posted 4 days ago",
            description = "Support guest check-in, queue control, venue setup, and end-of-day teardown for local events.",
            contactUrl = "tel:+15550101111"
        )
    )
}
