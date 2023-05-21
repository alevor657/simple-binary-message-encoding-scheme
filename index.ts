// 1 byte - header count
// 2 byte => header key length
// header key (max 1023)
// 2 bytes => header value length
// header value (max 1023)
// ...
//
// payload
// 256 * 1024 kb
//
// encode length validation
// decode length validation
// refactors
// use maps instead of plain objects
// motivate

class Message {
  headers: Record<string, string>;
  payload: Buffer;

  constructor(headers: Record<string, string>, payload: Buffer) {
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

  constructor() {
    this.textEncoder = new TextEncoder();
  }

  private estimateBufferSize(message: Message) {
    let headerLength = Object.entries(message.headers).reduce(
      (acc, [key, value]) => {
        const keyLength =
          this.textEncoder.encode(key).length + Codec.HEADER_LENGTH_SIZE;
        const valueLength =
          this.textEncoder.encode(value).length + Codec.HEADER_LENGTH_SIZE;

        return acc + keyLength + valueLength;
      },
      0
    );

    headerLength += Codec.ENCODED_HEADER_BYTE_LENGTH;

    const payloadLength = message.payload.length;

    return headerLength + payloadLength;
  }

  encode(message: Message): Buffer {
    const buffer = Buffer.alloc(this.estimateBufferSize(message));
    const messageHeaderEntries = Object.entries(message.headers);
    let offset = 0;
    const numberOfHeaders = messageHeaderEntries.length;

    offset = buffer.writeInt8(numberOfHeaders);

    for (const [key, value] of messageHeaderEntries) {
      // write key
      const encodedKey = this.textEncoder.encode(key);
      offset = buffer.writeInt16BE(encodedKey.length, offset);
      offset += Buffer.from(encodedKey).copy(buffer, offset);

      // write value
      const encodedValue = this.textEncoder.encode(value);
      offset = buffer.writeInt16BE(encodedValue.length, offset);
      offset += Buffer.from(encodedValue).copy(buffer, offset);
    }

    // write payload
    offset += message.payload.copy(buffer, offset);

    return buffer;
  }

  decode(buffer: Buffer): Message {
    let offset = 0;
    const headerCount = buffer.readInt8();
    offset += 1;
    let headers: Record<string, string> = {};

    for (let index = 0; index < headerCount; index++) {
      // read key
      const keyLength = buffer.readInt16BE(offset);
      offset += 2;
      const key = buffer.subarray(offset, offset + keyLength).toString("ascii");
      offset += keyLength;

      //read value
      const valueLength = buffer.readInt16BE(offset);
      offset += 2;
      const value = buffer
        .subarray(offset, offset + valueLength)
        .toString("ascii");
      offset += valueLength;

      headers[key] = value;
    }

    return new Message(headers, buffer.subarray(offset));
  }
}

const codec = new Codec();

const encoded = codec.encode(new Message({ a: "", b: "" }, Buffer.from("")));
console.log("encoded", encoded);
const decoded = codec.decode(encoded);
console.log("decoded", decoded);
