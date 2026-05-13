package com.jobtap.app.contact

import java.net.URI
import java.util.Locale

object ContactLinkValidator {

    private val REJECTED_SCHEMES = setOf(
        "javascript", "vbscript", "file", "content", "data", "about", "ftp"
    )

    fun isValid(link: String?): Boolean {
        val trimmed = link?.trim() ?: return false
        if (trimmed.isBlank()) return false

        val uri = try {
            URI(trimmed)
        } catch (e: Exception) {
            return false
        }

        val scheme = uri.scheme?.lowercase(Locale.US) ?: return false

        return when (scheme) {
            "http", "https" -> uri.host != null && uri.host.isNotBlank()
            "mailto", "tel", "sms" -> uri.schemeSpecificPart != null && uri.schemeSpecificPart.isNotBlank()
            in REJECTED_SCHEMES -> false
            else -> uri.schemeSpecificPart != null && uri.schemeSpecificPart.isNotBlank()
        }
    }
}
