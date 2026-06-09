package com.jobtap.app.analytics

interface DeviceIdStore {
    fun readDeviceId(): String?
    fun writeDeviceId(deviceId: String)
}
