package com.transaction.upload;

public class UnsupportedFileTypeException extends Exception {

    UnsupportedFileTypeException(final String message) {
        super(message);
    }
}
