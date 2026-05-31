import { Mail } from 'lucide-react';

export default function ContactSection({ contactChannels }) {
  return (
    <section className="contact-section" id="contact">
      <div className="section-shell contact-shell">
        <div className="section-heading contact-heading">
          <span>COMMUNICATION NODE</span>
          <h2>Contact</h2>
          <p>
            SF 탐사단의 협업, 협찬, 강의, 워크숍, 일반 문의를 위한 공식 연락
            채널입니다. 아래 이메일 또는 인스타그램으로 메시지를 보내주세요.
          </p>
        </div>

        <div className="contact-grid">
          <div className="contact-signal">
            <Mail aria-hidden="true" />
            <span>PRIMARY CHANNEL</span>
            <a href="mailto:brokenfuzz@gmail.com">brokenfuzz@gmail.com</a>
            <a href="https://www.instagram.com/aka_book_/" target="_blank" rel="noreferrer">
              instagram.com/aka_book_
            </a>
            <em>협업, 협찬, 강의, 워크숍, 일반 문의</em>
          </div>

          {contactChannels.map(channel => (
            <article className="contact-card" key={channel.label}>
              <span>{channel.label}</span>
              <h3>{channel.title}</h3>
              <p>{channel.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
