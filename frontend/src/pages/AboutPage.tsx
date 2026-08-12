import { Brand } from '../components/Brand';

interface AboutPageProps {
  onNavigate: (path: string) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <main className="about-page">
      <div className="noise" />
      <header className="profile-top">
        <Brand />
        <button className="about-back-button" type="button" onClick={() => onNavigate('/')}>← К КАРТЕ</button>
      </header>
      <article className="about-content hud-panel">
        <p className="panel-code">О ПЛАТФОРМЕ</p>
        <h1>Карта CTF-соревнований России</h1>
        <p className="about-lead">Это открытый навигатор по актуальным CTF-соревнованиям во всех регионах России. Чтобы просматривать карту, фильтровать события по типу и территории и открывать подробные карточки, регистрация не нужна.</p>

        <section>
          <h2>Что можно делать на сайте</h2>
          <ul>
            <li>находить текущие и ближайшие CTF на интерактивной карте;</li>
            <li>выбирать любой из 89 субъектов Российской Федерации;</li>
            <li>смотреть формат, сложность, расписание, условия участия и ссылки организатора;</li>
            <li>фильтровать профессиональные, локальные и тренировочные соревнования.</li>
          </ul>
        </section>

        <section>
          <h2>Для организаторов</h2>
          <p><strong>Если вы хотите провести соревнования, вы можете зарегистрироваться на платформе и оставить заявку.</strong></p>
          <p>В заявке указываются даты, формат, регион, описание, требования к участникам, категории заданий и официальные ссылки. После отправки администратор проверит сведения. Одобренное соревнование получит публичную карточку и появится на карте. В личном профиле можно отслеживать работу с заявкой и поддерживать контактные данные в актуальном состоянии.</p>
          <div className="about-actions">
            <button className="button admin-button admin-button--primary" type="button" onClick={() => onNavigate('/register')}>ЗАРЕГИСТРИРОВАТЬСЯ →</button>
            <button className="button admin-button" type="button" onClick={() => onNavigate('/login')}>ВОЙТИ</button>
          </div>
        </section>
      </article>
    </main>
  );
}
