CLI_OUT = cli/out
WASM_OUT = web/src/wasm

BINTOSYX = bintosyx
SYXTOBIN = syxtobin

define cli
	cd cli && g++ -std=c++11 -O2 -I common -o ../$(CLI_OUT)/lpx-$(1) common/common.cpp common/cli.cpp lpx-$(1)/parse.cpp lpx-$(1)/$(1).cpp
endef

all: clean cli wasm web

cli:
	mkdir -p $(CLI_OUT)
	$(call cli,$(BINTOSYX))
	$(call cli,$(SYXTOBIN))

wasm:
	mkdir -p $(WASM_OUT)
	cd cli && . ~/emsdk/emsdk_env.sh --build=Release && emcc -std=c++11 -O2 -I common -o ../$(WASM_OUT)/fwgen.js common/common.cpp web-patcher/main.cpp

web:
	cd web && yarn && yarn build

clean: clean_cli clean_wasm

clean_cli:
	rm -rf $(CLI_OUT)/*

clean_wasm:
	rm -rf $(WASM_OUT)/*