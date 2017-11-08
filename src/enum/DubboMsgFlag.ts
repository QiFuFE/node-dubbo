enum DubboMessageFlag {
    FLAG_REQUEST = 0x80,
    FLAG_TWOWAY = 0x40,
    FLAG_EVENT = 0x20,
    SERIALIZATION_MASK = 0x1f,
}

export default DubboMessageFlag;