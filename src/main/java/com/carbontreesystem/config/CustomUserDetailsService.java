package com.carbontreesystem.config;

import com.carbontreesystem.model.User;
import com.carbontreesystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado: " + username));

        // O Spring Security adiciona "ROLE_" automaticamente ao usar hasRole().
        // Aqui usamos SimpleGrantedAuthority diretamente, então o prefixo
        // deve estar presente UMA única vez: "ROLE_ADMIN", não "ROLE_ROLE_ADMIN".
        String roleName = "ROLE_" + user.getRole().name().toUpperCase();

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                user.isEnabled(),
                true, true, true,
                Collections.singletonList(new SimpleGrantedAuthority(roleName))
        );
    }
}