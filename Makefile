server: 
	cargo build
client: 
	cd webui && npx parcel build index.html
all: client server