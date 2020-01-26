#include "common.h"

byte lp_target;
char* version;

int ceil_div(int a, int b) {
	return a / b + (a % b != 0);
}

void create_sysex_start(int* i, char type) {
	output.data[(*i)++] = SYSEX_START;

	for (int j = 0; j < novation_header.size(); j++)
		output.data[(*i)++] = novation_header[j];
	
	output.data[(*i)++] = type;
}

void write_byte_array(int* i, const std::vector<byte> values) {
	for (int j = 0; j < values.size(); j++)
		output.data[(*i)++] = values[j];
}

std::vector<byte> uint_to_nibbles(uint n) {
	std::vector<byte> ret = {};

	for (int i = 0; i < 8; i++) {
		ret.push_back((n & 0xF0000000) >> 0x1C);
		n <<= 0x04;
	}

	return ret;
}

void write_block(int* i, int j, byte update_type) {
	create_sysex_start(i, update_type);

	for (int k = 0; k < 256; k++) {
		int shift = 7 - k % 8;
		int target = *i + k / 7;

		int read = j * 0x20 + k / 8;
		byte bit = read >= input.size;

		if (!bit) bit = (input.data[read] & (1 << shift)) >> shift;

		if (k % 7 == 0) output.data[target] = 0;

		output.data[target] |= bit << (6 - k % 7);
	}

	*i += 0x25;

	output.data[(*i)++] = SYSEX_END;
}

void convert() {
	int blocks = ceil_div(input.size, 0x20);

	if (!allocate_buffer(&output, 0x2D + 0x2C * blocks, "OUTPUT")) exit(1);

	int i = 0;

	create_sysex_start(&i, UPDATE_INIT);

	output.data[i++] = LPX_FAMILY_ID;
	output.data[i++] = lp_target;

	output.data[i++] = 0x00;
	output.data[i++] = 0x00;
	output.data[i++] = 0x00;

	for (int j = 0; j < 3; j++)
		output.data[i++] = version[j] & 0xF;

	output.data[i++] = SYSEX_END;

	create_sysex_start(&i, UPDATE_HEADER);

	output.data[i++] = lp_target == LPPROMK3_PRODUCT_ID;

	int version_len = strlen(version);

	for (int j = 0; j < 6 - version_len; j++)
		output.data[i++] = 0x30;

	for (int j = 0; j < version_len; j++)
		output.data[i++] = 0x30 | (version[j] & 0xF);

	write_byte_array(&i, uint_to_nibbles(input.size));
	write_byte_array(&i, uint_to_nibbles(crc32(&input)));

	output.data[i++] = SYSEX_END;

	for (int j = 1; j < blocks; j++)
		write_block(&i, j, UPDATE_WRITE);

	write_block(&i, 0, UPDATE_FINISH);
}