from app.schemas.user import CamelModel, UserOut


class VerificationTicketOut(CamelModel):
    id: str
    user: UserOut
    submitted_at: str
    status: str
    details: str | None = None
    contact: str | None = None
    comment: str | None = None


class VerificationUpdate(CamelModel):
    status: str
    comment: str | None = None


class RegistrationOut(CamelModel):
    id: str
    title: str
    organizer: str | None = None
    contact: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    format: str | None = None
    city: str | None = None
    region: str | None = None
    url: str | None = None
    description: str | None = None
    status: str
    comment: str | None = None


class RegistrationUpdate(CamelModel):
    status: str
    comment: str | None = None
