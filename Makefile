server: 
	cargo build
client: 
	cd webui && npx parcel build index.html
	sed -i 's/"\/webui/"webui/' webui/dist/index.html # bodge to make the path in the generated HTML relative
all: client server