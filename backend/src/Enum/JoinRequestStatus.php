<?php

declare(strict_types=1);

namespace App\Enum;

enum JoinRequestStatus: string
{
    case New = 'new';
    case Accepted = 'accepted';
    case Rejected = 'rejected';
}
