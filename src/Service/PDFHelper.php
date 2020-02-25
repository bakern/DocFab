<?php

namespace App\Service;

use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;
use Psr\Log\LoggerInterface;

class PDFHelper
{
    private $logger;

    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
    }

    /**
    * Decrypt a PDF using QPDF and return result
    * $pdf: UploadedFile
    * return: true if successfull, false on error
    **/
    public function decrypt($pdf)
    {
        $command = 'qpdf --decrypt --replace-input ' . $pdf->getRealPath();
        $process = Process::fromShellCommandline($command);
        $process->run();

        return $process->isSuccessful();
    }
}
