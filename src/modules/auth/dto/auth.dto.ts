export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: string;
}

export interface RefreshTokenDto {
  refreshToken?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
