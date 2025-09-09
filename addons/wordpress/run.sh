#!/usr/bin/env bash

# Avvia i servizi
echo "Starting..."
exec s6-svscan /etc/services.d
