package com.jobtap.app.analytics

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DeviceIdProviderTest {

    /** A fake store that tracks reads, writes, and the stored value. */
    private class FakeDeviceIdStore(
        initialState: String? = null
    ) : DeviceIdStore {
        var storedId: String? = initialState
        var readCount = 0
        var writtenIds = mutableListOf<String>()

        override fun readDeviceId(): String? {
            readCount++
            return storedId
        }

        override fun writeDeviceId(deviceId: String) {
            storedId = deviceId
            writtenIds.add(deviceId)
        }
    }

    // -------------------------------------------- existing id

    @Test
    fun `getOrCreateDeviceId returns existing id without writing`() {
        val store = FakeDeviceIdStore(initialState = "device-fixed")
        val provider = DeviceIdProvider(store) { "should-not-be-called" }

        val result = provider.getOrCreateDeviceId()

        assertEquals("device-fixed", result)
        assertEquals("must read once", 1, store.readCount)
        assertTrue("must not write", store.writtenIds.isEmpty())
    }

    @Test
    fun `getOrCreateDeviceId returns existing nonblank id even when idFactory would produce different value`() {
        val store = FakeDeviceIdStore(initialState = "persisted-id")
        var factoryCallCount = 0
        val provider = DeviceIdProvider(store) {
            factoryCallCount++
            "factory-generated"
        }

        val result = provider.getOrCreateDeviceId()

        assertEquals("persisted-id", result)
        assertEquals(0, factoryCallCount)
        assertTrue(store.writtenIds.isEmpty())
    }

    // -------------------------------------------- missing id

    @Test
    fun `getOrCreateDeviceId generates writes and returns id when store has null`() {
        val store = FakeDeviceIdStore(initialState = null)
        val provider = DeviceIdProvider(store) { "fresh-uuid" }

        val result = provider.getOrCreateDeviceId()

        assertEquals("fresh-uuid", result)
        assertEquals("must read once", 1, store.readCount)
        assertEquals("must write once", listOf("fresh-uuid"), store.writtenIds)
    }

    // -------------------------------------------- blank id

    @Test
    fun `getOrCreateDeviceId generates writes and returns id when store has blank string`() {
        val store = FakeDeviceIdStore(initialState = "   ")
        val provider = DeviceIdProvider(store) { "blank-replaced" }

        val result = provider.getOrCreateDeviceId()

        assertEquals("blank-replaced", result)
        assertEquals(listOf("blank-replaced"), store.writtenIds)
    }

    @Test
    fun `getOrCreateDeviceId generates writes and returns id when store has empty string`() {
        val store = FakeDeviceIdStore(initialState = "")
        val provider = DeviceIdProvider(store) { "empty-replaced" }

        val result = provider.getOrCreateDeviceId()

        assertEquals("empty-replaced", result)
        assertEquals(listOf("empty-replaced"), store.writtenIds)
    }

    // -------------------------------------------- id factory is called

    @Test
    fun `idFactory result is used as the device id`() {
        val store = FakeDeviceIdStore(initialState = null)
        val provider = DeviceIdProvider(store) { "factory-output" }

        val result = provider.getOrCreateDeviceId()

        assertEquals("factory-output", result)
        assertEquals("factory-output", store.storedId)
    }

    @Test
    fun `getOrCreateDeviceId is idempotent on subsequent calls after generation`() {
        val store = FakeDeviceIdStore(initialState = null)
        var factorySeq = listOf("first", "second").iterator()
        val provider = DeviceIdProvider(store) { factorySeq.next() }

        val first = provider.getOrCreateDeviceId()
        val second = provider.getOrCreateDeviceId()

        assertEquals("first", first)
        assertEquals("first", second)
        assertEquals(listOf("first"), store.writtenIds)
    }
}
