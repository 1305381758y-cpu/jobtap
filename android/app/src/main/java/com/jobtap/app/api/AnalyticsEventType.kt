package com.jobtap.app.api

enum class AnalyticsEventType(val serverValue: String) {
    APP_OPEN("app_open"),
    JOB_LIST_VIEW("job_list_view"),
    JOB_DETAIL_VIEW("job_detail_view"),
    CONTACT_CLICK("contact_click")
}
