package com.jobtap.app.api

data class BootstrapResponse(
    val countryCode: String?,
    val countrySource: String?,
    val supportedLocales: List<String>,
    val appConfig: Map<String, Any>
)
