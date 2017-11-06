enum ResponseStatus {
    OK = 20,
    CLIENT_TIMEOUT = 30,
    SERVER_TIMEOUT = 31,
    BAD_REQUEST = 40,
    BAD_RESPONSE = 50,
    SERVICE_NOT_FOUND = 60,
    SERVICE_ERROR = 70,
    SERVER_ERROR = 80,
    CLIENT_ERROR = 90,
    /**
     * server side threadpool exhausted and quick return.
     */
    SERVER_THREADPOOL_EXHAUSTED_ERROR = 100,
}

export default ResponseStatus;