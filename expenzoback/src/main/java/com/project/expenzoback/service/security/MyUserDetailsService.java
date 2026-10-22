package com.project.expenzoback.service.security;

import com.project.expenzoback.model.security.Users;
import com.project.expenzoback.repository.UsersRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class MyUserDetailsService implements UserDetailsService {

    @Autowired
    private UsersRepo usersRepo;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Users user = usersRepo.findByUsername(username);
        if(user == null)
        {
            throw new UsernameNotFoundException("User not found with username: " + username);
        }
        return new UserPrincipal(user);//returning a single user from DB
    }
}
