# Simple Binary Message Encoding Scheme

This is a simple binary encoding scheme using JS Buffers, written in typescript

## Format

The format is as follows:

- 1st byte - number of headers
- next 2 bytes - header key size
- next `header key size` bytes - header key
- next 2 bytes - header value size
- next `header value size` bytes - header value
- other bytes - payload

## Running

This runs in node v18, just run `npm start`

## Assumptions and considerations

- I am allowing utf-8 just to keep it simple
- I am not optimizing on very granular level
- I am not writing tests to speed it up
- I do not have any validation when decoding and no error handling because I wanted to save time
