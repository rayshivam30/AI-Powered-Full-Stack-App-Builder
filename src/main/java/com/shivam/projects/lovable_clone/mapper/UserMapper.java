package com.shivam.projects.lovable_clone.mapper;

import com.shivam.projects.lovable_clone.dto.auth.SignupRequest;
import com.shivam.projects.lovable_clone.dto.auth.UserProfileResponse;
import com.shivam.projects.lovable_clone.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {

    User toEntity(SignupRequest signupRequest);

    UserProfileResponse toUserProfileResponse(User user);

}
