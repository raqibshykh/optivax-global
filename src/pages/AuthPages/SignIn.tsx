import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | Optivax Global"
        description="Sign in to your Optivax Global account"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
