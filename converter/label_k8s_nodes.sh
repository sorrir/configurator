#!/bin/sh

kubectl --namespace=fh-validation annotate nodes pi3-01 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\",\"BLUETOOTH\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes pi3-02 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\",\"BLUETOOTH\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes pi3-03 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\",\"BLUETOOTH\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes pi3-04 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\",\"BLUETOOTH\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes pi3-05 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\",\"BLUETOOTH\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes pi3-06 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\",\"BLUETOOTH\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes pi3-07 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\",\"BLUETOOTH\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes pi3-08 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\",\"BLUETOOTH\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes pi3-09 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\",\"BLUETOOTH\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes desktop-01 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes desktop-02 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes desktop-03 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes desktop-04 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes jetson-01 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\"\] --overwrite
kubectl --namespace=fh-validation annotate nodes jetson-02 sorrir.host.protocols=\[\"REST\",\"MQTT\",\"MQTT_EXTERNAL\"\] --overwrite

kubectl --namespace=fh-validation label nodes pi3-01 sorrir.host.class=raspberry-pi3 --overwrite
kubectl --namespace=fh-validation label nodes pi3-02 sorrir.host.class=raspberry-pi3 --overwrite
kubectl --namespace=fh-validation label nodes pi3-03 sorrir.host.class=raspberry-pi3 --overwrite
kubectl --namespace=fh-validation label nodes pi3-04 sorrir.host.class=raspberry-pi3 --overwrite
kubectl --namespace=fh-validation label nodes pi3-05 sorrir.host.class=raspberry-pi3 --overwrite
kubectl --namespace=fh-validation label nodes pi3-06 sorrir.host.class=raspberry-pi3 --overwrite
kubectl --namespace=fh-validation label nodes pi3-07 sorrir.host.class=raspberry-pi3 --overwrite
kubectl --namespace=fh-validation label nodes pi3-08 sorrir.host.class=raspberry-pi3 --overwrite
kubectl --namespace=fh-validation label nodes pi3-09 sorrir.host.class=raspberry-pi3 --overwrite
kubectl --namespace=fh-validation label nodes desktop-01 sorrir.host.class=desktop --overwrite
kubectl --namespace=fh-validation label nodes desktop-02 sorrir.host.class=desktop --overwrite
kubectl --namespace=fh-validation label nodes desktop-03 sorrir.host.class=desktop --overwrite
kubectl --namespace=fh-validation label nodes desktop-04 sorrir.host.class=desktop --overwrite
kubectl --namespace=fh-validation label nodes jetson-01 sorrir.host.class=jetson --overwrite
kubectl --namespace=fh-validation label nodes jetson-02 sorrir.host.class=jetson --overwrite
