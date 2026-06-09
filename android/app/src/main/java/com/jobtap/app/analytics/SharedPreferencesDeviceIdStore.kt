package com.jobtap.app.analytics

import android.content.Context

class SharedPreferencesDeviceIdStore(context: Context) : DeviceIdStore {

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    override fun readDeviceId(): String? {
        return prefs.getString(KEY_DEVICE_ID, null)
    }

    override fun writeDeviceId(deviceId: String) {
        prefs.edit().putString(KEY_DEVICE_ID, deviceId).apply()
    }

    companion object {
        private const val PREFS_NAME = "jobtap_device"
        private const val KEY_DEVICE_ID = "device_id"
    }
}
