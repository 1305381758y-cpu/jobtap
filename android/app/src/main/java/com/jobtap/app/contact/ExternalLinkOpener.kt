package com.jobtap.app.contact

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri

object ExternalLinkOpener {
    fun open(context: Context, uriString: String): String? {
        val trimmed = uriString.trim()
        val uri: Uri = try {
            Uri.parse(trimmed)
        } catch (_: Exception) {
            return "Invalid URI"
        }

        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_HISTORY)
        }

        return try {
            context.startActivity(intent)
            null
        } catch (_: ActivityNotFoundException) {
            "No app available to handle this link"
        } catch (_: SecurityException) {
            "Security restriction prevented opening this link"
        } catch (_: Exception) {
            "Unable to open contact link"
        }
    }
}
