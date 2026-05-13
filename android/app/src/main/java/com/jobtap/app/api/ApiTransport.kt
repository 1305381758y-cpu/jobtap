package com.jobtap.app.api

interface ApiTransport {
    fun get(url: String): String
    fun postJson(url: String, jsonBody: String)
}
