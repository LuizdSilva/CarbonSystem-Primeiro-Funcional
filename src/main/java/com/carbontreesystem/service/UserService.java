package com.carbontreesystem.service;

import org.springframework.stereotype.Service;

import com.carbontreesystem.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository; 

    public boolean verificarUsuario(String nome) {
        return userRepository.existsByUsername(nome); 
    }
}