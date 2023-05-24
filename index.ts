class HeaderNumberExceededError extends Error {}
class HeaderKeySizeExceededError extends Error {}
class HeaderValueSizeExceededError extends Error {}
class PayloadSizeExceededError extends Error {}

class Message {
  headers: Map<string, string>;
  payload: Buffer;

  constructor(headers: Map<string, string>, payload: Buffer) {
    this.headers = headers;
    this.payload = payload;
  }
}

class Codec {
  private textEncoder: TextEncoder;

  // Size of header length in bytes
  static HEADER_LENGTH_SIZE = 2;
  // Size of header count in bytes
  static ENCODED_HEADER_BYTE_LENGTH = 1;
  // Max header key and value length in bytes
  static HEADER_KV_LENGTH = 1023;
  static MAX_NUMBER_OF_HEADERS = 63;
  // in bytes
  static MAX_PAYLOAD_SIZE = 256 * 1024;

  constructor() {
    this.textEncoder = new TextEncoder();
  }

  private convertToBufferMap(
    map: Map<string, string>
  ): Map<Uint8Array, Uint8Array> {
    if (map.size > Codec.MAX_NUMBER_OF_HEADERS)
      throw new HeaderNumberExceededError(
        `Header limit exceeded, number of passed headers: ${map.size}, max number of headers: ${Codec.MAX_NUMBER_OF_HEADERS}`
      );

    let byteArrayMap = new Map<Uint8Array, Uint8Array>();

    for (const [key, value] of map.entries()) {
      const encodedKey = this.textEncoder.encode(key);
      const encodedValue = this.textEncoder.encode(value);

      if (encodedKey.length > Codec.HEADER_KV_LENGTH)
        throw new HeaderKeySizeExceededError(
          `Header key size exceeded, max key size is ${Codec.HEADER_KV_LENGTH}`
        );

      if (encodedValue.length > Codec.HEADER_KV_LENGTH)
        throw new HeaderValueSizeExceededError(
          `Header value size exceeded, max value size is ${Codec.HEADER_KV_LENGTH}`
        );

      byteArrayMap.set(encodedKey, encodedValue);
    }

    return byteArrayMap;
  }

  private estimateBufferSize(
    payload: Buffer,
    headers: Map<Uint8Array, Uint8Array>
  ) {
    const payloadLength = payload.length;
    let headerLength = Codec.ENCODED_HEADER_BYTE_LENGTH;

    if (payloadLength > Codec.MAX_PAYLOAD_SIZE)
      throw new PayloadSizeExceededError(
        `Payload size exceeded, max payload size is ${Codec.MAX_PAYLOAD_SIZE}`
      );

    for (const [key, value] of headers.entries()) {
      const keyLength = key.length + Codec.HEADER_LENGTH_SIZE;
      const valueLength = value.length + Codec.HEADER_LENGTH_SIZE;

      headerLength += keyLength + valueLength;
    }

    return headerLength + payloadLength;
  }

  encode(message: Message): Buffer {
    const headersAsByteArrays = this.convertToBufferMap(message.headers);
    const bufferSize = this.estimateBufferSize(
      message.payload,
      headersAsByteArrays
    );
    const buffer = Buffer.alloc(bufferSize);
    let offset = 0;
    const numberOfHeaders = message.headers.size;

    offset = buffer.writeInt8(numberOfHeaders);

    for (const [key, value] of headersAsByteArrays.entries()) {
      // write key
      offset = buffer.writeInt16BE(key.length, offset);
      offset += Buffer.from(key).copy(buffer, offset);

      // write value
      offset = buffer.writeInt16BE(value.length, offset);
      offset += Buffer.from(value).copy(buffer, offset);
    }

    // write payload
    offset += message.payload.copy(buffer, offset);

    return buffer;
  }

  decode(buffer: Buffer): Message {
    let offset = 0;
    const headerCount = buffer.readInt8();
    offset += Codec.ENCODED_HEADER_BYTE_LENGTH;
    let headers = new Map<string, string>();

    for (let index = 0; index < headerCount; index++) {
      // read key
      const keyLength = buffer.readInt16BE(offset);
      offset += Codec.HEADER_LENGTH_SIZE;
      const key = buffer.subarray(offset, offset + keyLength).toString("ascii");
      offset += keyLength;

      //read value
      const valueLength = buffer.readInt16BE(offset);
      offset += Codec.HEADER_LENGTH_SIZE;
      const value = buffer
        .subarray(offset, offset + valueLength)
        .toString("ascii");
      offset += valueLength;

      headers.set(key, value);
    }

    return new Message(headers, buffer.subarray(offset));
  }
}

const codec = new Codec();

const encoded = codec.encode(
  new Message(
    new Map([
      ["a", "a"],
      ["bb", "bb"],
    ]),
    Buffer.from("test")
  )
);
console.log("encoded", encoded);
const decoded = codec.decode(encoded);
console.log("decoded", decoded);
