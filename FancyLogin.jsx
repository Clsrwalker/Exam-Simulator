import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FancyLogin.css";

// 这是一个简易的“加载中”组件示例
function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

function FancyLogin() {
  const navigate = useNavigate();

  // 1. 新增loading状态
  const [loading, setLoading] = useState(false);

  const [isSignIn, setIsSignIn] = useState(false);

  const [signUpData, setSignUpData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [signInData, setSignInData] = useState({
    email: "",
    password: ""
  });

  const handleToggle = (e) => {
    e.preventDefault();
    setIsSignIn((prev) => !prev);
  };

  const handleSignUpChange = (e) => {
    setSignUpData({
      ...signUpData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignInChange = (e) => {
    setSignInData({
      ...signInData,
      [e.target.name]: e.target.value
    });
  };

  // 2. 注册
  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      setLoading(true); // 显示loading
      const res = await fetch("http://localhost:3000/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signUpData),
      });
      const data = await res.json();
      setLoading(false); // 请求结束，隐藏loading

      if (res.ok) {
        // 注册成功 => 跳转
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.userId);
        navigate("/dashboard");
      } else {
        // 注册失败 => 给用户提示
        alert("注册失败：" + data.error);
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
      alert("注册请求失败");
    }
  };

  // 3. 登录
  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      setLoading(true); // 显示loading
      const res = await fetch("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signInData)
      });
      const data = await res.json();
      setLoading(false); // 请求结束，隐藏loading

      if (res.ok) {
        // 登录成功 => 存储 token, 跳转
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.userId);
        navigate("/dashboard");
      } else {
        // 登录失败 => 提示
        alert("登录失败：" + data.error);
      }
    } catch (err) {
      setLoading(false);
      console.error(err);
      alert("登录请求失败");
    }
  };

  return (
    <div className="login-root">
      {/* 如果 loading 为 true，就显示加载动画覆盖层 */}
      {loading && <LoadingOverlay />}

      {/* 你的登录页其余结构 */}
      <div className="glass-effect"></div>
      <div className="corner-circle-left-bottom"></div>
      <div className="corner-circle-right-bottom"></div>
      <div className="corner-circle-left-top"></div>
      <div className="corner-circle-right-top"></div>

      <div className="exam-title">Exam Simulator</div>
      <div className="shell">
        {/* 左容器（Create Account） */}
        <div className={`container a-container ${isSignIn ? "is-txl" : ""}`} id="a-container">
          {!isSignIn && (
            <form className="form" id="a-form" onSubmit={handleSignUp}>
              <h2 className="form_title title">Create Account</h2>
              <span className="form_span">Choose a method or sign up by Email</span>
              <input
                type="text"
                className="form_input"
                name="name"
                placeholder="Name"
                value={signUpData.name}
                onChange={handleSignUpChange}
              />
              <input
                type="text"
                className="form_input"
                name="email"
                placeholder="Email"
                value={signUpData.email}
                onChange={handleSignUpChange}
              />
              <input
                type="password"
                className="form_input"
                name="password"
                placeholder="Password"
                value={signUpData.password}
                onChange={handleSignUpChange}
              />
              <button className="form_button button submit">
                SIGN UP
              </button>
            </form>
          )}
        </div>

        {/* 右容器（Sign In） */}
        <div className={`container b-container ${isSignIn ? "is-txl is-z" : ""}`} id="b-container">
          {isSignIn && (
            <form className="form" id="b-form" onSubmit={handleSignIn}>
              <h2 className="form_title title">Sign In</h2>
              <span className="form_span">Choose a method or sign in by Email</span>
              <input
                type="text"
                className="form_input"
                name="email"
                placeholder="Email"
                value={signInData.email}
                onChange={handleSignInChange}
              />
              <input
                type="password"
                className="form_input"
                name="password"
                placeholder="Password"
                value={signInData.password}
                onChange={handleSignInChange}
              />
              <a className="form_link">Forgot password?</a>
              <button className="form_button button submit">
                SIGN IN
              </button>
            </form>
          )}
        </div>

        {/* 中间的“切换”按钮 */}
        <div className={`switch ${isSignIn ? "is-txr is-gx" : ""}`} id="switch-cnt">
          <div className={`switch_circle ${isSignIn ? "is-txr" : ""}`} />
          <div className={`switch_circle switch_circle-t ${isSignIn ? "is-txr" : ""}`} />

          <div className={`switch_container ${isSignIn ? "is-hidden" : ""}`} id="switch-c1">
            <h2 className="switch_title title" style={{ letterSpacing: 0 }}>
              Welcome Back!
            </h2>
            <p className="switch_description description">
              Already have an account? Sign in to try our exam simulator!
            </p>
            <button
              className="switch_button button switch-btn"
              onClick={handleToggle}
            >
              SIGN IN
            </button>
          </div>

          <div className={`switch_container ${isSignIn ? "" : "is-hidden"}`} id="switch-c2">
            <h2 className="switch_title title" style={{ letterSpacing: 0 }}>
              Hello Friend!
            </h2>
            <p className="switch_description description">
              Don’t have an account? Create one and enjoy all our features!
            </p>
            <button
              className="switch_button button switch-btn"
              onClick={handleToggle}
            >
              SIGN UP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FancyLogin;
