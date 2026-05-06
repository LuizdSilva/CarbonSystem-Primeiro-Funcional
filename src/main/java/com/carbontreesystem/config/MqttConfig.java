package com.carbontreesystem.config;

import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Optional;

@Slf4j
@Configuration
@ConfigurationProperties(prefix = "mqtt")
public class MqttConfig {

    @Value("${mqtt.broker.url:tcp://localhost:8080}")
    private String brokerUrl;

    @Value("${mqtt.client.id:carbontree-server}")
    private String clientId;

    @Bean
    public Optional<MqttClient> mqttClient() {
        try {
            MqttClient client = new MqttClient(
                    brokerUrl,
                    clientId + "-" + System.currentTimeMillis(),
                    new MemoryPersistence()
            );

            MqttConnectOptions options = new MqttConnectOptions();
            options.setCleanSession(true);
            options.setConnectionTimeout(10);
            options.setKeepAliveInterval(60);
            options.setAutomaticReconnect(true);

            log.info("Tentando conexão MQTT em: {}", brokerUrl);
            client.connect(options);
            log.info("MQTT conectado com sucesso!");
            return Optional.of(client);

        } catch (MqttException e) {
            log.warn("Broker MQTT não disponível ({}). O sistema funcionará sem sensores " +
                     "em tempo real. Erro: {}", brokerUrl, e.getMessage());
            return Optional.empty(); 
        }
    }
}