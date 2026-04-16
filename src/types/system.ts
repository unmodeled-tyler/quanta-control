export interface DependencyStatus {
  installed: boolean;
  version?: string;
}

export interface GithubStatus extends DependencyStatus {
  authenticated: boolean;
  user?: string;
  error?: string;
}

export interface GitIdentityStatus {
  configured: boolean;
  name: string;
  email: string;
}

export interface SystemStatus {
  git: DependencyStatus;
  node: DependencyStatus;
  npm: DependencyStatus;
  github: GithubStatus;
  gitIdentity: GitIdentityStatus;
}
