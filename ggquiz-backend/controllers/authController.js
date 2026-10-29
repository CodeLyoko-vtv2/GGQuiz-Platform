const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

// TODO: Bật lại gửi mail khi lên Production
function createMailTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

// TODO: Bật lại gửi mail khi lên Production
async function sendVerificationEmail(email, name, verificationToken) {
  const verifyUrl = `${BACKEND_URL}/api/auth/verify?token=${verificationToken}`;
  const transporter = createMailTransporter();

  await transporter.sendMail({
    from: `"GGQuiz" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: "Xác nhận email tài khoản GGQuiz",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f172a; color: #fff; border-radius: 16px;">
        <h1 style="color: #c084fc; margin-bottom: 8px;">Chào mừng đến với GGQuiz!</h1>
        <p style="color: #cbd5e1; line-height: 1.6;">
          Xin chào <strong>${name}</strong>, vui lòng xác nhận email để kích hoạt tài khoản và bước vào đấu trường tri thức Esports.
        </p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}"
             style="display: inline-block; background: #9333ea; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold;">
            Xác nhận
          </a>
        </p>
        <p style="color: #94a3b8; font-size: 13px; word-break: break-all;">
          Nếu nút không hoạt động, mở liên kết sau:<br/>
          <a href="${verifyUrl}" style="color: #c084fc;">${verifyUrl}</a>
        </p>
      </div>
    `,
  });
}

function signAuthToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin" });
    }

    // TODO: Bật lại gửi mail khi lên Production
    // if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    //   return res.status(500).json({
    //     message: "Máy chủ chưa cấu hình SMTP_EMAIL / SMTP_PASSWORD",
    //   });
    // }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Email đã được sử dụng" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // TODO: Bật lại gửi mail khi lên Production
    // const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        // Dev/test: kích hoạt ngay, bỏ qua xác thực email
        isVerified: true,
        verificationToken: null,
        // TODO: Bật lại gửi mail khi lên Production
        // isVerified: false,
        // verificationToken,
      },
    });

    // TODO: Bật lại gửi mail khi lên Production
    // try {
    //   await sendVerificationEmail(user.email, user.name, verificationToken);
    // } catch (mailError) {
    //   console.error("Send verification email error:", mailError);
    //   await prisma.user.delete({ where: { id: user.id } });
    //   return res.status(500).json({
    //     message: "Không gửi được email xác nhận. Vui lòng thử lại sau.",
    //   });
    // }
    //
    // return res.status(201).json({
    //   message: "Đăng ký thành công. Vui lòng kiểm tra email để xác nhận tài khoản.",
    //   email: user.email,
    //   requiresVerification: true,
    // });

    const token = signAuthToken(user);

    return res.status(201).json({
      message: "Đăng ký thành công",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "",
        theme: user.theme || "light",
        language: user.language || "vi",
        plan: user.plan || "free",
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();

    if (!token) {
      return res.redirect(`${FRONTEND_URL}/login?verify=missing`);
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return res.redirect(`${FRONTEND_URL}/login?verify=invalid`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });

    const jwtToken = signAuthToken(user);

    return res.redirect(
      `${FRONTEND_URL}/?auth_token=${encodeURIComponent(jwtToken)}`
    );
  } catch (error) {
    console.error("Verify email error:", error);
    return res.redirect(`${FRONTEND_URL}/login?verify=error`);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    if (user.status === "banned") {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }

    // TODO: Bật lại gửi mail khi lên Production
    // if (!user.isVerified) {
    //   return res.status(403).json({
    //     message: "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư của bạn.",
    //   });
    // }

    const token = signAuthToken(user);

    return res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || "",
        theme: user.theme || "light",
        language: user.language || "vi",
        plan: user.plan || "free",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};
