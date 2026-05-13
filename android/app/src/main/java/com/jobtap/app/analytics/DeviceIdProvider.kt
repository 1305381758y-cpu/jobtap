package com.jobtap.app.analytics

class DeviceIdProvider(
    private val store: DeviceIdStore,
    private val idFactory: () -> String
) {
    fun getOrCreateDeviceId(): String {
        val existing = store.readDeviceId()
        if (!existing.isNullOrBlank()) {
            return existing
        }
        val newId = idFactory()
        store.writeDeviceId(newId)
        return newId
    }
}
